// frontend/src/components/layout/ClientDashboardLayout.jsx
// Client-specific layout using unified design

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CreditCard, MessageSquare, HelpCircle,
  LogOut, Menu, Bell, Maximize, Settings, ChevronRight, ChevronDown,
  Database, Check, X, Trash2, CheckCheck, User, Megaphone, FolderHeart,
  PanelLeftClose, PanelLeft, BookOpen, MessageCircleQuestion
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import Breadcrumb from '../Breadcrumb';
import FloatingHelpButton from '../help/FloatingHelpButton';
import ProductTour from '../help/ProductTour';
import { clientDashboardTourSteps } from '../help/tourSteps';
import { useTour } from '../../contexts/TourContext';
import axios from 'axios';
import useChatUnreadCount from '../../hooks/useChatUnreadCount';

const ClientDashboardLayout = ({ children, pageTitle, pageSubtitleTop, pageSubtitleBottom, breadcrumbs, fullHeight = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    sidebarGradient, 
    headerGradient,
    sidebarColorScheme,
    headerColorScheme,
    headerIsLight,
    sidebarIsLight,
    isDarkMode,
    sidebarCollapsed: savedCollapsed,
    updateSetting,
    animationEnabled,
    initialized: userSettingsLoaded
  } = useUserSettings();
  
  const { unreadCount: chatUnreadCount, clearCount: clearChatBadge } = useChatUnreadCount();
  const { startTour } = useTour();

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
  
  // Announcements
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Navigation links - Main section with icon colors
  const mainNavLinks = [
    { name: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard, iconColor: 'text-blue-500' },
    { name: 'Reports', path: '/client/reports', icon: FileText, iconColor: 'text-purple-500' },
    { name: 'Collections & Favorites', path: '/client/collections', icon: FolderHeart, iconColor: 'text-blue-500' },
    { name: 'Subscriptions', path: '/client/subscriptions', icon: CreditCard, iconColor: 'text-emerald-500' },
    { name: 'Announcements', path: '/client/announcements', icon: Megaphone, iconColor: 'text-pink-500', badge: unreadAnnouncementsCount },
    { name: 'Chat', path: '/client/chat', icon: MessageSquare, iconColor: 'text-orange-500', badge: chatUnreadCount },
  ];

  // Navigation links - Support section with icon colors
  const supportNavLinks = [
    { name: 'Help Center', path: '/client/help-center', icon: BookOpen, iconColor: 'text-teal-500' },
    { name: 'FAQ', path: '/client/faq', icon: MessageCircleQuestion, iconColor: 'text-cyan-500' },
    { name: 'Settings', path: '/settings', icon: Settings, iconColor: 'text-gray-500' },
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

  // Fetch notifications and announcements
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

  const fetchAnnouncementsCount = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/announcements/unread_count/', { withCredentials: true });
      setUnreadAnnouncementsCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching announcements count:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAnnouncementsCount();
  }, []);

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
    if (path === '/client/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user?.username?.[0].toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleStartTour = () => {
    startTour();
  };

  const handleTourComplete = () => {
    localStorage.setItem('clientTourCompleted', 'true');
  };

  // Sidebar expanded state (no hover - click only)
  const showExpanded = !isSidebarCollapsed;
  
  // Header text color logic: in dark mode, always use light text
  const headerTextIsLight = isDarkMode ? false : headerIsLight;

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'report': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'subscription': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* CSS for animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .sidebar-enter { animation: slideIn 0.3s ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>

      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={`${
          showExpanded ? 'w-60' : 'w-16'
        } flex flex-col shadow-xl relative z-50 transition-all duration-300 ease-in-out`}
        style={{ background: sidebarGradient }}
      >
        {/* Logo Section */}
        <div className={`h-16 flex items-center ${showExpanded ? 'px-4' : 'justify-center'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-10 h-10 ${sidebarIsLight ? 'bg-black/10' : 'bg-white/20'} rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm`}>
              <Database className={`w-6 h-6 ${sidebarIsLight ? 'text-gray-800' : 'text-white'}`} />
            </div>
            {showExpanded && (
              <div className="transition-all duration-300 overflow-hidden">
                <h2 className={`text-lg font-bold whitespace-nowrap ${sidebarIsLight ? 'text-gray-900' : 'text-white'}`}>A Data</h2>
                <p className={`text-xs whitespace-nowrap ${sidebarIsLight ? 'text-gray-600' : 'text-white/60'}`}>Client Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNavLinks.map((link) => {
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
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-600 text-white shadow-lg'
                      : sidebarIsLight
                        ? 'text-gray-700 hover:bg-black/10 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                    active 
                      ? 'text-white scale-110' 
                      : sidebarIsLight
                        ? 'group-hover:scale-110'  // Light sidebar: inherit text color
                        : `${link.iconColor} group-hover:scale-110`  // Dark sidebar: colorful icons
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
                        ? 'bg-white text-blue-600' 
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

          {/* Divider */}
          <div className={`my-4 border-t ${sidebarIsLight ? 'border-black/10' : 'border-white/10'}`} />

          {/* Support Navigation */}
          <div className="space-y-1">
            {supportNavLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              
              return (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  title={!showExpanded ? link.name : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    active
                      ? sidebarIsLight 
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-600 text-white shadow-lg'
                      : sidebarIsLight
                        ? 'text-gray-700 hover:bg-black/10 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                    active 
                      ? 'text-white scale-110' 
                      : sidebarIsLight
                        ? 'group-hover:scale-110'  // Light sidebar: inherit text color
                        : `${link.iconColor} group-hover:scale-110`  // Dark sidebar: colorful icons
                  }`} />
                  
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                  } overflow-hidden`}>
                    {link.name}
                  </span>
                  
                  {active && showExpanded && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout Button Only */}
        <div className={`p-3 border-t ${sidebarIsLight ? 'border-black/10' : 'border-white/10'}`}>
          <button
            onClick={handleLogout}
            title={!showExpanded ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              sidebarIsLight 
                ? 'text-gray-600 hover:bg-red-100 hover:text-red-600'
                : 'text-white/70 hover:bg-red-500/20 hover:text-red-300'
            } ${!showExpanded && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`text-sm font-medium transition-all duration-300 ${
              showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            } overflow-hidden whitespace-nowrap`}>
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
              className={`w-8 h-8 rounded-lg transition-all duration-300 flex items-center justify-center ${headerTextIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} hover:scale-105 active:scale-95`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                {/* Top line - rotates to form X */}
                <span 
                  className={`absolute h-[2px] ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                    isSidebarCollapsed 
                      ? 'w-4 rotate-45 translate-y-0' 
                      : 'w-4 -translate-y-1.5 rotate-0'
                  }`}
                />
                {/* Middle line - fades out and scales */}
                <span 
                  className={`absolute h-[2px] w-4 ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-300 ease-in-out ${
                    isSidebarCollapsed 
                      ? 'opacity-0 scale-0 rotate-180' 
                      : 'opacity-100 scale-100 rotate-0'
                  }`}
                />
                {/* Bottom line - rotates to form X */}
                <span 
                  className={`absolute h-[2px] ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                    isSidebarCollapsed 
                      ? 'w-4 -rotate-45 translate-y-0' 
                      : 'w-4 translate-y-1.5 rotate-0'
                  }`}
                />
              </div>
            </button>
            
            <div>
              {pageSubtitleTop && (
                <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/60'}`}>{pageSubtitleTop}</p>
              )}
              <h1 className={`text-base font-semibold ${headerTextIsLight ? 'text-gray-900' : 'text-white'}`}>
                {pageTitle || [...mainNavLinks, ...supportNavLinks].find(link => isActive(link.path))?.name || 'Dashboard'}
              </h1>
              {pageSubtitleBottom && (
                <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/70'}`}>{pageSubtitleBottom}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition-colors hidden sm:flex ${headerTextIsLight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
              title="Toggle Fullscreen"
            >
              <Maximize className={`w-5 h-5 ${headerTextIsLight ? 'text-gray-800' : 'text-white'}`} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef} data-tour="notifications">
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
                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
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
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => { navigate('/client/notifications'); setShowNotifications(false); }}
                      className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium py-2"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef} data-tour="profile-menu">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1 pr-3 rounded-xl transition-colors ${headerTextIsLight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
              >
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ${
                    headerTextIsLight 
                      ? 'bg-gray-700 text-white ring-gray-400/50' 
                      : 'ring-white/30 text-white'
                  }`}
                  style={!headerTextIsLight ? { background: isDarkMode ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : headerGradient } : undefined}
                >
                  {getUserInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className={`text-sm font-semibold leading-none ${headerTextIsLight ? 'text-gray-900' : 'text-white'}`}>
                    {user?.full_name || user?.username}
                  </p>
                  <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/60'}`}>Premium Account</p>
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
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : headerIsLight ? 'text-gray-900' : 'text-white'}`}>{user?.full_name}</p>
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
                    <button
                      onClick={() => { navigate('/client/subscriptions'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
                    >
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Subscriptions</span>
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
        <main className={`flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 ${
          fullHeight ? 'overflow-hidden' : 'overflow-y-auto pb-10'
        }`}>
          {children}
        </main>

        {/* Fixed Footer */}
        <footer className="h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>© 2025 A Data. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <button onClick={() => navigate('/privacy-policy')} className=" hidden sm:inline font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacy Policy</button>
            <span className="hidden sm:inline">•</span>
            <button onClick={() => navigate('/terms-of-service')} className="hidden sm:inline font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Terms of Service</button>
          </div>
          <div className="flex items-center gap-2 mr-14">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="hidden sm:inline">All systems operational</span>
          </div>
        </footer>
      </div>
      
      {/* Help Button & Tour */}
      <FloatingHelpButton onStartTour={handleStartTour} />
      <ProductTour steps={clientDashboardTourSteps} onComplete={handleTourComplete} />
    </div>
  );
};

export default ClientDashboardLayout;
