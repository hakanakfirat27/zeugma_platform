import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CreditCard, MessageSquare, HelpCircle,
  LogOut, Menu, Bell, Moon, Sun, Maximize, Settings, ChevronRight, Database
} from 'lucide-react';

const ClientDashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Reports', path: '/client/reports', icon: FileText, color: 'text-purple-500' },
    { name: 'Subscriptions', path: '/client/subscriptions', icon: CreditCard, color: 'text-green-500' },
    { name: 'Chat', path: '/client/chat', icon: MessageSquare, color: 'text-orange-500' },
    { name: 'FAQ', path: '/client/faq', icon: HelpCircle, color: 'text-pink-500' },
  ];

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  const sidebarWidth = isSidebarOpen || isSidebarHovered ? 'w-64' : 'w-20';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        onMouseEnter={() => !isSidebarOpen && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-800 via-slate-900 to-slate-900 text-white flex flex-col shadow-2xl relative z-50`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              {(isSidebarOpen || isSidebarHovered) && (
                <div className="transition-opacity duration-200">
                  <h2 className="text-lg font-bold text-white">Zeugma</h2>
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
              return (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : link.color}`} />
                  {(isSidebarOpen || isSidebarHovered) && (
                    <span className="font-medium transition-opacity duration-200">{link.name}</span>
                  )}
                  {active && (isSidebarOpen || isSidebarHovered) && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-700/50">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 ${!(isSidebarOpen || isSidebarHovered) && 'justify-center'}`}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-lg">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
            </div>
            {(isSidebarOpen || isSidebarHovered) && (
              <div className="flex-1 transition-opacity duration-200">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-xs text-slate-400">Client Account</p>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-red-600/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              {(isSidebarOpen || isSidebarHovered) && <span className="font-medium">Logout</span>}
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
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Page Title */}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {navLinks.find(link => isActive(link.path))?.name || 'Dashboard'}
                </h1>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-gray-600" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize className="w-5 h-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Settings */}
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* User Avatar */}
              <button className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {getUserInitials()}
                </div>
              </button>
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

export default ClientDashboardLayout;