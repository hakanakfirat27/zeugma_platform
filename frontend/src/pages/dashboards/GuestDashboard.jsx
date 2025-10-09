import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, Lock, Star, LogOut } from 'lucide-react';

const GuestDashboard = () => {
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
                <p className="text-xs text-gray-500">Guest</p>
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
          <h2 className="text-3xl font-bold text-gray-900">Guest Dashboard</h2>
          <p className="mt-2 text-gray-600">
            Explore limited database previews. Upgrade to access full data.
          </p>
        </div>

        {/* Upgrade Banner */}
        <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Upgrade Your Account</h3>
              <p className="text-blue-100 mb-4">
                Get full access to our comprehensive database with thousands of manufacturers worldwide
              </p>
              <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Contact Sales
              </button>
            </div>
            <Star className="w-24 h-24 opacity-50" />
          </div>
        </div>

        {/* Database Preview */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Database Preview</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/database')}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Injection Moulders</h4>
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Preview the first 5 records from our comprehensive database
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-500 mb-2">Sample Data (Limited)</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> ████████
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Country:</span> Germany
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Contact:</span> ████████
                  </div>
                </div>
              </div>
              <button className="btn-secondary w-full">View Preview</button>
            </div>

            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/database')}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Blow Moulders</h4>
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Preview the first 5 records from our comprehensive database
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-500 mb-2">Sample Data (Limited)</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> ████████
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Country:</span> France
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Contact:</span> ████████
                  </div>
                </div>
              </div>
              <button className="btn-secondary w-full">View Preview</button>
            </div>

            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/database')}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Sheet Extruders</h4>
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Preview the first 5 records from our comprehensive database
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-500 mb-2">Sample Data (Limited)</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> ████████
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Country:</span> Italy
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Contact:</span> ████████
                  </div>
                </div>
              </div>
              <button className="btn-secondary w-full">View Preview</button>
            </div>

            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/database')}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Pipe Extruders</h4>
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Preview the first 5 records from our comprehensive database
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-500 mb-2">Sample Data (Limited)</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> ████████
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Country:</span> UK
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Contact:</span> ████████
                  </div>
                </div>
              </div>
              <button className="btn-secondary w-full">View Preview</button>
            </div>
          </div>
        </div>

        {/* Features Locked */}
        <div className="card bg-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Lock className="w-5 h-5 inline mr-2" />
            Premium Features
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Full company contact information</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Advanced filtering and search</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Export to Excel with watermark</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Access to all 10 database categories</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Regular database updates</span>
            </li>
          </ul>
          <button className="btn-primary w-full mt-6">
            Upgrade to Full Access
          </button>
        </div>
      </main>
    </div>
  );
};

export default GuestDashboard;