import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, Calendar, Download, LogOut, Search } from 'lucide-react';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Zeugma Research</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.username}</p>
                <p className="text-xs text-gray-500">Client</p>
              </div>
              <button onClick={logout} className="btn-secondary">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Client Dashboard</h2>
          <p className="mt-2 text-gray-600">
            Access your purchased databases and manage your subscriptions
          </p>
        </div>

        {/* My Subscriptions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">My Subscriptions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">PVC Manufacturers in Europe</h4>
                  <p className="text-sm text-gray-500 mt-1">Database Access</p>
                </div>
                <span className="badge-success">Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Calendar className="w-4 h-4" />
                <span>Expires: December 31, 2025</span>
              </div>
              <button className="btn-primary w-full" onClick={() => navigate('/database')}>
                <Database className="w-4 h-4 mr-2" />
                View Database
              </button>
            </div>

            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Injection Moulders Worldwide</h4>
                  <p className="text-sm text-gray-500 mt-1">Database Access</p>
                </div>
                <span className="badge-success">Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Calendar className="w-4 h-4" />
                <span>Expires: March 15, 2026</span>
              </div>
              <button className="btn-primary w-full" onClick={() => navigate('/database')}>
                <Database className="w-4 h-4 mr-2" />
                View Database
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card text-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/database')}>
            <Search className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Search Database</h4>
            <p className="text-sm text-gray-600 mb-4">
              Access your full database
            </p>
            <button className="btn-secondary w-full">Search</button>
          </div>

          <div className="card text-center">
            <Download className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Export Data</h4>
            <p className="text-sm text-gray-600 mb-4">
              Download your databases to Excel
            </p>
            <button className="btn-secondary w-full">Export</button>
          </div>

          <div className="card text-center">
            <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Renew</h4>
            <p className="text-sm text-gray-600 mb-4">
              Extend your subscriptions
            </p>
            <button className="btn-secondary w-full">Manage</button>
          </div>
        </div>

        {/* Database Preview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">PVC manufacturers in Germany</p>
                <p className="text-sm text-gray-500">142 results found</p>
              </div>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Injection moulders with automotive</p>
                <p className="text-sm text-gray-500">89 results found</p>
              </div>
              <span className="text-sm text-gray-500">Yesterday</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;