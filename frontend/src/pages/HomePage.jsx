// frontend/src/pages/HomePage.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, Users, TrendingUp, Shield } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Function to get the correct dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!user) return '/login';

    switch (user.role) {
      case 'SUPERADMIN':
      case 'STAFF_ADMIN':
        return '/staff-dashboard';
      case 'CLIENT':
        return '/client-dashboard';
      case 'GUEST':
        return '/guest-dashboard';
      default:
        return '/guest-dashboard';
    }
  };

  const handleDashboardClick = () => {
    const dashboardUrl = getDashboardUrl();
    console.log('Navigating to:', dashboardUrl, 'User role:', user?.role);
    navigate(dashboardUrl);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Database className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Zeugma Research</span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    Hello, <span className="font-semibold">{user.username}</span>
                  </span>
                  <button
                    onClick={handleDashboardClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Global Plastic Industry Database
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Access comprehensive data on plastic manufacturers, processors, and suppliers worldwide
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <Database className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comprehensive Data
            </h3>
            <p className="text-sm text-gray-600">
              Access detailed information on manufacturers across 10 categories
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Global Coverage
            </h3>
            <p className="text-sm text-gray-600">
              Companies from every major plastics-producing region worldwide
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Advanced Filtering
            </h3>
            <p className="text-sm text-gray-600">
              Powerful search and filter tools to find exactly what you need
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure & Reliable
            </h3>
            <p className="text-sm text-gray-600">
              Enterprise-grade security with subscription-based access control
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Database Categories
          </h2>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              'Injection Moulders',
              'Blow Moulders',
              'Roto Moulders',
              'PE Film Extruders',
              'Sheet Extruders',
              'Pipe Extruders',
              'Tube & Hose Extruders',
              'Profile Extruders',
              'Cable Extruders',
              'Compounders'
            ].map((category) => (
              <div
                key={category}
                className="bg-white p-4 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer"
              >
                <p className="font-medium text-gray-900">{category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;