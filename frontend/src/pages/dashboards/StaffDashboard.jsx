import { useNavigate } from 'react-router-dom';
import { Database, Users, FileText, Settings } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const StaffDashboard = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-indigo-600 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">Zeugma Research Staff Dashboard</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600 mb-8">Here's what's happening with your platform today.</p>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">12,458</p>
              </div>
              <Database className="w-10 h-10 text-blue-600 opacity-75" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">342</p>
              </div>
              <Users className="w-10 h-10 text-green-600 opacity-75" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Custom Reports</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">28</p>
              </div>
              <FileText className="w-10 h-10 text-purple-600 opacity-75" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
              </div>
              <Settings className="w-10 h-10 text-orange-600 opacity-75" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/superdatabase')}>
            <Database className="w-10 h-10 text-blue-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Browse Superdatabase</h4>
            <p className="text-sm text-gray-600">View and manage all company records</p>
          </div>

          <div className="card hover:shadow-md transition-shadow cursor-pointer">
            <Users className="w-10 h-10 text-green-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Manage Users</h4>
            <p className="text-sm text-gray-600">Add, edit, or remove user accounts</p>
          </div>

          <div className="card hover:shadow-md transition-shadow cursor-pointer">
            <FileText className="w-10 h-10 text-purple-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Create Report</h4>
            <p className="text-sm text-gray-600">Generate custom client reports</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;