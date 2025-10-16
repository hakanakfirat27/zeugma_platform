// frontend/src/components/layout/DashboardLayout.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, LogOut, Maximize, Minimize, FileText, CreditCard, Users } from 'lucide-react'; // MODIFIED: Added Users icon

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/staff-dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'STAFF_ADMIN'] },
    { name: 'Superdatabase', path: '/superdatabase', icon: Database, roles: ['SUPERADMIN', 'STAFF_ADMIN'] },
    { name: 'Custom Reports', path: '/custom-reports', icon: FileText, roles: ['SUPERADMIN', 'STAFF_ADMIN'] },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard, roles: ['SUPERADMIN', 'STAFF_ADMIN'] },
    // --- NEW LINK FOR USER MANAGEMENT ---
    { name: 'User Management', path: '/user-management', icon: Users, roles: ['SUPERADMIN'] }
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

  const isActive = (path) => location.pathname === path;

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user?.username?.[0].toUpperCase() || 'U';
  };

  const getUserRole = () => {
    if (!user?.role) return 'User';
    return user.role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col shadow-2xl bg-gradient-to-b from-gray-800 to-gray-900 text-white">
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-l font-bold shadow-lg ring-4 ring-indigo-500/20">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">{user?.full_name || user?.username || 'User'}</h3>
              <p className="text-sm text-gray-400">{getUserRole()}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-3 text-gray-500">Management</p>
          <div className="space-y-1">
            {navLinks
              .filter(link => user?.role && link.roles.includes(user.role.toUpperCase()))
              .map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.name}
                    onClick={() => navigate(link.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isActive(link.path) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{link.name}</span>
                  </button>
                );
              })}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button onClick={toggleFullscreen} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-gray-800 hover:text-white">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            <span className="font-medium">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-red-600/10 hover:text-red-400">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
