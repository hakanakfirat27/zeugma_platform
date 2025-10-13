// frontend/src/components/layout/DashboardLayout.jsx
// COMPLETE FILE - Dark mode without page reload

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, LogOut, Moon, Sun, Maximize, Minimize } from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true';
    }
    return false;
  });

  // --- ADDED: State for fullscreen mode ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // --- ADDED: useEffect to sync with browser's fullscreen state ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };


  // --- ADDED: Function to toggle browser fullscreen mode ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
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
    if (!user?.role) return 'User';
    return user.role.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <aside className={`w-64 flex flex-col shadow-2xl ${
        darkMode
          ? 'bg-gradient-to-b from-gray-950 to-black text-white'
          : 'bg-gradient-to-b from-gray-800 to-gray-900 text-white'
      }`}>
        {/* User Profile Card */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-gray-700'}`}>
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
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                {getUserRole()}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <p className={`px-3 text-xs font-semibold uppercase tracking-wider mb-3 ${
            darkMode ? 'text-gray-600' : 'text-gray-500'
          }`}>
            Management
          </p>

          <div className="space-y-1">
            <button
              onClick={() => navigate('/staff-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive('/staff-dashboard')
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
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
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Superdatabase</span>
            </button>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className={`p-4 border-t space-y-2 ${darkMode ? 'border-gray-800' : 'border-gray-700'}`}>

          {/* --- ADDED: Fullscreen Button --- */}
          <button
            onClick={toggleFullscreen}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${darkMode ? 'text-gray-300 hover:bg-gray-900 hover:text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            <span className="font-medium">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
              darkMode
                ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {darkMode ? (
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
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
              darkMode
                ? 'text-gray-300 hover:bg-red-900/20 hover:text-red-400'
                : 'text-gray-300 hover:bg-red-600/10 hover:text-red-400'
            }`}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Pass darkMode state and toggle to children via context or props */}
        <div data-dark-mode={darkMode}>
          {children}
        </div>
      </div>

      {/* Global Dark Mode Styles */}
      <style>{`
        /* Dark mode for entire app */
        .dark {
          color-scheme: dark;
        }

        /* Dark mode text colors */
        .dark .text-gray-900 {
          color: #f3f4f6 !important;
        }

        .dark .text-gray-800 {
          color: #e5e7eb !important;
        }

        .dark .text-gray-700 {
          color: #d1d5db !important;
        }

        .dark .text-gray-600 {
          color: #9ca3af !important;
        }

        .dark .text-gray-500 {
          color: #6b7280 !important;
        }

        /* Dark mode backgrounds */
        .dark .bg-white {
          background-color: #1f2937 !important;
        }

        .dark .bg-gray-50 {
          background-color: #111827 !important;
        }

        .dark .bg-gray-100 {
          background-color: #1f2937 !important;
        }

        /* Dark mode borders */
        .dark .border-gray-100,
        .dark .border-gray-200,
        .dark .border-gray-300 {
          border-color: #374151 !important;
        }

        /* Dark mode cards */
        .dark .card {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
          color: #f3f4f6 !important;
        }

        /* Dark mode inputs */
        .dark input,
        .dark textarea,
        .dark select {
          background-color: #1f2937 !important;
          color: #f3f4f6 !important;
          border-color: #374151 !important;
        }

        .dark input::placeholder,
        .dark textarea::placeholder {
          color: #6b7280 !important;
        }

        /* Dark mode hover states */
        .dark .hover\\:bg-gray-50:hover {
          background-color: #374151 !important;
        }

        .dark .hover\\:bg-gray-100:hover {
          background-color: #4b5563 !important;
        }

        /* Keep colored backgrounds visible */
        .dark .bg-indigo-600,
        .dark .bg-blue-600,
        .dark .bg-green-600,
        .dark .bg-purple-600,
        .dark .bg-orange-600,
        .dark .bg-red-600,
        .dark [class*="bg-gradient"] {
          /* Keep original colors */
        }

        /* Dark mode alert boxes */
        .dark .bg-blue-50 {
          background-color: #1e3a8a !important;
        }

        .dark .bg-yellow-50 {
          background-color: #78350f !important;
        }

        .dark .bg-green-50 {
          background-color: #14532d !important;
        }

        .dark .bg-red-50 {
          background-color: #7f1d1d !important;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;