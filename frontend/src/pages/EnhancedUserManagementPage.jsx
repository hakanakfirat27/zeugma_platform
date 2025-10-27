// frontend/src/pages/EnhancedUserManagementPage.jsx
// This is an enhanced version of UserManagementPage with tabs for Activity Dashboard

import { useState } from 'react';
import { Users, Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import UserActivityDashboard from '../components/userActivity/UserActivityDashboard';
import UserManagementPage from './UserManagementPage';

const EnhancedUserManagementPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'activity'

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`
                  px-6 py-3 font-medium text-sm border-b-2 transition-colors
                  ${activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`
                  px-6 py-3 font-medium text-sm border-b-2 transition-colors
                  ${activeTab === 'activity'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>User Activity</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'users' && <UserManagementContent />}
          {activeTab === 'activity' && <UserActivityDashboard />}
        </div>
      </div>
    </DashboardLayout>
  );
};

// This component wraps the original UserManagementPage content
// You'll need to extract the main content from UserManagementPage.jsx
// and place it here, or import UserManagementPage without its layout
const UserManagementContent = () => {
  return (
    <div>
      {/*
        Import and render the main content of UserManagementPage here
        (everything except the DashboardLayout wrapper and back button)
      */}
      <UserManagementPage />
    </div>
  );
};

export default EnhancedUserManagementPage;