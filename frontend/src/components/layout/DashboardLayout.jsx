import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Database, LogOut, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getUserInitials = () => {
    if (!user?.username) return 'U';
    const names = user.username.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  const getUserRole = () => {
    if (!user?.user_type) return 'User';
    return user.user_type.charAt(0) + user.user_type.slice(1).toLowerCase();
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-950 dark:to-black text-white flex flex-col shadow-2xl">
        {/* User Profile Card */}
        <div className="p-6 border-b border-gray-700 dark:border-gray-800">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-indigo-500/20">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-gray-800"></div>
            </div>

            {/* User Info */}
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {user?.username || 'User'}
              </h3>
              <p className="text-sm text-gray-400">
                {getUserRole()} Admin
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
        <div className="p-4 border-t border-gray-700 dark:border-gray-800 space-y-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-all"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5" />
                <span className="font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span className="font-medium">Dark Mode</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-red-600/10 hover:text-red-400 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;