import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, Users, TrendingUp, Shield, ArrowRight } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Zeugma Research
              </span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">
                    Hello, <span className="font-semibold">{user.username}</span>
                  </span>
                  <button
                    onClick={handleDashboardClick}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2   ">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xl font-medium text-gray-700">Trusted by industry leaders worldwide</span>
          </div>

          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Deploy to the cloud
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              with confidence
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Access comprehensive data on plastic manufacturers, processors, and suppliers worldwide.
            Make informed decisions with our enterprise-grade database.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => user ? handleDashboardClick() : navigate('/signup')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              Get started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl hover:bg-white transition-all shadow-md hover:shadow-lg font-semibold text-lg flex items-center gap-2 border border-white/40"
            >
              Learn more
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mt-20">
          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-xl transition-all border border-white/40 group hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Comprehensive Data
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Access detailed information on manufacturers across 10 categories
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-xl transition-all border border-white/40 group hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Global Coverage
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Companies from every major plastics-producing region worldwide
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-xl transition-all border border-white/40 group hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Advanced Filtering
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Powerful search and filter tools to find exactly what you need
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-xl transition-all border border-white/40 group hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Secure & Reliable
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Enterprise-grade security with subscription-based access control
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Database Categories
            </h2>
            <p className="text-lg text-gray-600">
              Explore our comprehensive database across all major plastic manufacturing sectors
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { name: 'Injection Moulders', color: 'from-blue-500 to-blue-600' },
              { name: 'Blow Moulders', color: 'from-purple-500 to-purple-600' },
              { name: 'Roto Moulders', color: 'from-pink-500 to-pink-600' },
              { name: 'PE Film Extruders', color: 'from-indigo-500 to-indigo-600' },
              { name: 'Sheet Extruders', color: 'from-violet-500 to-violet-600' },
              { name: 'Pipe Extruders', color: 'from-cyan-500 to-cyan-600' },
              { name: 'Tube & Hose Extruders', color: 'from-teal-500 to-teal-600' },
              { name: 'Profile Extruders', color: 'from-emerald-500 to-emerald-600' },
              { name: 'Cable Extruders', color: 'from-orange-500 to-orange-600' },
              { name: 'Compounders', color: 'from-rose-500 to-rose-600' }
            ].map((category, index) => (
              <div
                key={category.name}
                className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-white/40 group hover:scale-105"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-lg mb-3 group-hover:scale-110 transition-transform`}></div>
                <p className="font-semibold text-gray-900 text-sm">{category.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center shadow-2xl">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of industry professionals who trust our platform for their business intelligence needs
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl font-bold text-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all border-2 border-white/30 font-bold text-lg"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-white/40 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>© 2025 Zeugma Research. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;