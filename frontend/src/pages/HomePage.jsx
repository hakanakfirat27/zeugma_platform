import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, Users, TrendingUp, Shield } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN') {
      return '/dashboard';
    }
    if (user?.role === 'CLIENT') {
      return '/dashboard/client';
    }
    if (user?.role === 'GUEST') {
      return '/dashboard/guest';
    }
    return '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Zeugma Research</h1>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">
                    Hello, <span className="font-medium">{user?.username}</span>
                  </span>
                  <Link to={getDashboardLink()} className="btn-primary">
                    Dashboard
                  </Link>
                  <button onClick={logout} className="btn-secondary">
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary">
                    Log In
                  </Link>
                  <Link to="/signup" className="btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Global Plastic Industry Database
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access comprehensive data on plastic manufacturers, processors, and suppliers worldwide
          </p>

          {!isAuthenticated && (
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/signup" className="btn-primary text-lg px-8 py-3">
                Get Started
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                Log In
              </Link>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          <div className="card text-center">
            <Database className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Comprehensive Data</h3>
            <p className="text-gray-600 text-sm">
              Access detailed information on manufacturers across 10 categories
            </p>
          </div>

          <div className="card text-center">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Global Coverage</h3>
            <p className="text-gray-600 text-sm">
              Companies from every major plastics-producing region worldwide
            </p>
          </div>

          <div className="card text-center">
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Advanced Filtering</h3>
            <p className="text-gray-600 text-sm">
              Powerful search and filter tools to find exactly what you need
            </p>
          </div>

          <div className="card text-center">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-gray-600 text-sm">
              Enterprise-grade security with subscription-based access control
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Database Categories</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              'Compounders',
            ].map((category) => (
              <div key={category} className="card text-center py-4 hover:shadow-md transition-shadow">
                <p className="font-medium text-gray-900">{category}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2025 Zeugma Research. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;