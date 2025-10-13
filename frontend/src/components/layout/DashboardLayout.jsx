// frontend/src/components/layout/DashboardLayout.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, LogOut, Maximize, Minimize } from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

const getUserInitials = () => {
  if (user?.full_name) {
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  if (user?.username) {
    return user.username.substring(0, 2).toUpperCase();
  }
  return 'U';
};

  const getUserRole = () => {
    if (!user?.role) return 'User';
    return user.role.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col shadow-2xl bg-gradient-to-b from-gray-800 to-gray-900 text-white">
        {/* User Profile Card */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-indigo-500/20">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-gray-800"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {user?.full_name || user?.username || 'User'}
              </h3>
              <p className="text-sm text-gray-400">
                {getUserRole()}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-3 text-gray-500">
            Management
          </p>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/staff-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive('/staff-dashboard')
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/superdatabase')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive('/superdatabase')
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Superdatabase</span>
            </button>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={toggleFullscreen}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            <span className="font-medium">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-red-600/10 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;